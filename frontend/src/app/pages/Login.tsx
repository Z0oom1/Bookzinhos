import { useState, useEffect, useRef } from "react";
import { login, register, fetchAllUsers } from "../lib/api";

const VERTEX_SHADER_SRC = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;

  uniform vec3 iResolution;
  uniform float iTime;
  uniform vec4 iMouse;
  uniform sampler2D iChannel0;

  void mainImage(out vec4 fragColor, in vec2 fragCoord)
  {
    const float NUM_ZERO = 0.0;
    const float NUM_ONE = 1.0;
    const float POWER_EXPONENT = 6.0;

    vec2 uv = fragCoord / iResolution.xy;
    vec2 m2 = uv - 0.5;

    // Size of the card in screen pixels (width: 448px, height: 570px)
    vec2 cardSize = vec2(448.0, 570.0);
    // Dynamically limit size to fit screen with padding on mobile
    cardSize = min(cardSize, iResolution.xy - 32.0);
    
    vec2 halfSize = cardSize / iResolution.xy / 2.0;

    // Rounded box calculation
    vec2 d = abs(m2) / halfSize;
    float roundedBox = pow(d.x, POWER_EXPONENT) + pow(d.y, POWER_EXPONENT);

    // Muffs inside the box (body of the lens)
    float rb1 = clamp((NUM_ONE - roundedBox) * 8.0, NUM_ZERO, NUM_ONE);
    // Rim specular light
    float rb2 = clamp((1.02 - roundedBox) * 25.0, NUM_ZERO, NUM_ONE) - clamp((0.98 - roundedBox) * 25.0, NUM_ZERO, NUM_ONE);

    fragColor = vec4(NUM_ZERO);
    float transition = smoothstep(NUM_ZERO, NUM_ONE, rb1 + rb2);

    if (transition > NUM_ZERO) {
      // High-end glass refraction
      float refractStrength = 0.045 * (NUM_ONE - roundedBox);
      vec2 lens = uv - m2 * refractStrength;
      
      // Blur sampling inside the glass (supersampling for soft glass look)
      float total = NUM_ZERO;
      for (float x = -2.0; x <= 2.0; x++) {
        for (float y = -2.0; y <= 2.0; y++) {
          vec2 offset = vec2(x, y) * 1.0 / iResolution.xy;
          fragColor += texture2D(iChannel0, offset + lens);
          total += NUM_ONE;
        }
      }
      fragColor /= total;

      // Inner lighting gradient & rim highlight
      float gradient = clamp((m2.y + 0.5) / 2.0, NUM_ZERO, NUM_ONE);
      vec4 lighting = clamp(fragColor + vec4(0.06) * gradient + vec4(rb2) * 0.18, NUM_ZERO, NUM_ONE);

      fragColor = mix(texture2D(iChannel0, uv), lighting, transition);
    } else {
      fragColor = texture2D(iChannel0, uv);
    }
  }

  void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
  }
`;

interface LoginProps {
  onLoginSuccess: (name: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllUsers()
      .then((u) => setUsersList(u || []))
      .catch((err) => console.error("Erro ao obter usuários no login:", err));
  }, []);

  const matchedUser = usersList.find(
    (u) => u.username.trim().toLowerCase() === name.trim().toLowerCase()
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const img = new Image();
    img.src = "/mac_wallpaper.png";

    let animationFrameId: number;
    let texture: WebGLTexture | null = null;
    let program: WebGLProgram | null = null;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (vs && fs) {
      program = gl.createProgram();
      if (program) {
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);
      }
    }

    if (!program) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      resolution: gl.getUniformLocation(program, "iResolution"),
      time: gl.getUniformLocation(program, "iTime"),
      mouse: gl.getUniformLocation(program, "iMouse"),
      texture: gl.getUniformLocation(program, "iChannel0"),
    };

    texture = gl.createTexture();
    const setupTexture = () => {
      if (!texture) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        img
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    img.onload = () => {
      setupTexture();
    };
    if (img.complete) {
      setupTexture();
    }

    const startTime = performance.now();
    const render = () => {
      if (!program) return;
      const currentTime = (performance.now() - startTime) / 1000;

      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform3f(uniforms.resolution, canvas.width, canvas.height, 1.0);
      gl.uniform1f(uniforms.time, currentTime);
      // Static mouse center coord
      gl.uniform4f(uniforms.mouse, canvas.width / 2.0, canvas.height / 2.0, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniforms.texture, 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      cancelAnimationFrame(animationFrameId);
      if (gl) {
        if (texture) gl.deleteTexture(texture);
        if (program) gl.deleteProgram(program);
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        if (buffer) gl.deleteBuffer(buffer);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;

    setIsLoading(true);
    setError("");
    
    try {
      let res;
      if (isRegistering) {
        res = await register(name.trim(), password.trim());
      } else {
        res = await login(name.trim(), password.trim());
      }
      
      localStorage.setItem("books-username", res.username);
      localStorage.setItem("books-bio", res.bio);
      localStorage.setItem("books-avatar", res.avatar);
      localStorage.setItem("profile-shelf", JSON.stringify(res.shelf));
      
      onLoginSuccess(res.username);
    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen w-full flex items-center justify-center p-4 overflow-hidden relative select-none">
      {/* WebGL Liquid Glass Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />

      {/* Login Card overlaying refracted canvas area */}
      <div className="w-full max-w-md relative z-10 transition-all duration-300">
        <div className="bg-white/5 border border-white/20 rounded-[2.5rem] p-10 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
          {/* Top border highlight glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Logo */}
          <div className="text-center mb-8 relative">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-white/25 backdrop-blur-md rounded-[2.25rem] mb-6 shadow-sm border border-white/30 p-2 overflow-hidden select-none transition-transform duration-500 hover:scale-105">
              {matchedUser ? (
                <span className="text-5xl">{matchedUser.avatar || "👤"}</span>
              ) : (
                <img src="/icone.png" alt="myBooks Logo" className="w-full h-full object-contain rounded-2xl" />
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800 mb-2">
              myBooks
            </h1>
            <p className="text-[9px] font-black text-[var(--primary)] flex items-center justify-center gap-1.5 uppercase tracking-[0.25em] leading-none">
              {isRegistering ? "Crie sua conta para começar" : "Gerenciador Pessoal de Leitura"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                Usuário
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: caio"
                className="w-full px-5 py-4 bg-white/20 border border-white/30 rounded-2xl outline-none focus:border-[var(--primary)] focus:bg-white/35 transition-all text-xs font-semibold text-slate-800 placeholder:text-slate-500"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest pl-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-white/20 border border-white/30 rounded-2xl outline-none focus:border-[var(--primary)] focus:bg-white/35 transition-all text-xs font-semibold text-slate-800 placeholder:text-slate-500"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-500 text-xs font-semibold text-center bg-white/30 border border-white/20 p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || !password.trim() || isLoading}
              className={`w-full mt-6 py-4 font-bold rounded-2xl transition-all relative overflow-hidden group shadow-md cursor-pointer ${
                !name.trim() || !password.trim() || isLoading
                  ? "bg-white/30 text-slate-400 cursor-not-allowed border border-white/20 shadow-none"
                  : "bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 active:scale-[0.98] transition-all shadow-[0_10px_25px_-5px_rgba(244,63,94,0.3)]"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2.5">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{isRegistering ? "Criando..." : "Entrando..."}</span>
                </div>
              ) : (
                <span className="relative z-10 text-[10px] font-black uppercase tracking-widest">{isRegistering ? "Criar conta" : "Entrar"}</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              disabled={isLoading}
              className="text-[10px] font-bold text-slate-650 hover:text-slate-800 transition-all cursor-pointer uppercase tracking-widest"
            >
              {isRegistering ? "Já tenho uma conta" : "Não tenho uma conta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
