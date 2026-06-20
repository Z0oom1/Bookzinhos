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
    const float NUM_HALF = 0.5;
    const float NUM_TWO = 2.0;
    const float POWER_EXPONENT = 6.0;
    const float MASK_MULTIPLIER_1 = 10000.0;
    const float MASK_MULTIPLIER_2 = 9500.0;
    const float MASK_MULTIPLIER_3 = 11000.0;
    const float LENS_MULTIPLIER = 5000.0;
    const float MASK_STRENGTH_1 = 8.0;
    const float MASK_STRENGTH_2 = 16.0;
    const float MASK_STRENGTH_3 = 2.0;
    const float MASK_THRESHOLD_1 = 0.95;
    const float MASK_THRESHOLD_2 = 0.9;
    const float MASK_THRESHOLD_3 = 1.5;
    const float SAMPLE_RANGE = 4.0;
    const float SAMPLE_OFFSET = 0.5;
    const float GRADIENT_RANGE = 0.2;
    const float GRADIENT_OFFSET = 0.1;
    const float GRADIENT_EXTREME = -1000.0;
    const float LIGHTING_INTENSITY = 0.3;

    vec2 uv = fragCoord / iResolution.xy;
    vec2 mouse = iMouse.xy;
    if (length(mouse) < NUM_ONE) {
      mouse = iResolution.xy / NUM_TWO;
    }
    vec2 m2 = (uv - mouse / iResolution.xy);

    float roundedBox = pow(abs(m2.x * iResolution.x / iResolution.y), POWER_EXPONENT) + pow(abs(m2.y), POWER_EXPONENT);
    float rb1 = clamp((NUM_ONE - roundedBox * MASK_MULTIPLIER_1) * MASK_STRENGTH_1, NUM_ZERO, NUM_ONE);
    float rb2 = clamp((MASK_THRESHOLD_1 - roundedBox * MASK_MULTIPLIER_2) * MASK_STRENGTH_2, NUM_ZERO, NUM_ONE) -
      clamp(pow(MASK_THRESHOLD_2 - roundedBox * MASK_MULTIPLIER_2, NUM_ONE) * MASK_STRENGTH_2, NUM_ZERO, NUM_ONE);
    float rb3 = clamp((MASK_THRESHOLD_3 - roundedBox * MASK_MULTIPLIER_3) * MASK_STRENGTH_3, NUM_ZERO, NUM_ONE) -
      clamp(pow(NUM_ONE - roundedBox * MASK_MULTIPLIER_3, NUM_ONE) * MASK_STRENGTH_3, NUM_ZERO, NUM_ONE);

    fragColor = vec4(NUM_ZERO);
    float transition = smoothstep(NUM_ZERO, NUM_ONE, rb1 + rb2);

    if (transition > NUM_ZERO) {
      vec2 lens = ((uv - NUM_HALF) * NUM_ONE * (NUM_ONE - roundedBox * LENS_MULTIPLIER) + NUM_HALF);
      float total = NUM_ZERO;
      for (float x = -SAMPLE_RANGE; x <= SAMPLE_RANGE; x++) {
        for (float y = -SAMPLE_RANGE; y <= SAMPLE_RANGE; y++) {
          vec2 offset = vec2(x, y) * SAMPLE_OFFSET / iResolution.xy;
          fragColor += texture2D(iChannel0, offset + lens);
          total += NUM_ONE;
        }
      }
      fragColor /= total;

      float gradient = clamp((clamp(m2.y, NUM_ZERO, GRADIENT_RANGE) + GRADIENT_OFFSET) / NUM_TWO, NUM_ZERO, NUM_ONE) +
        clamp((clamp(-m2.y, GRADIENT_EXTREME, GRADIENT_RANGE) * rb3 + GRADIENT_OFFSET) / NUM_TWO, NUM_ZERO, NUM_ONE);
      vec4 lighting = clamp(fragColor + vec4(rb1) * gradient + vec4(rb2) * LIGHTING_INTENSITY, NUM_ZERO, NUM_ONE);

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

    let currentMouse = [window.innerWidth / 2, window.innerHeight / 2];
    const updateMouse = (x: number, y: number) => {
      currentMouse = [x, window.innerHeight - y];
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateMouse(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);

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
      gl.uniform4f(uniforms.mouse, currentMouse[0], currentMouse[1], 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniforms.texture, 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
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

      {/* Login Card with Liquid Glass (Glassmorphic) Effect */}
      <div className="w-full max-w-md relative z-10 transition-all duration-300">
        <div className="bg-white/10 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.15)] border border-white/40 relative overflow-hidden">
          {/* Top border highlight glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

          {/* Logo */}
          <div className="text-center mb-8 relative">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-white/30 backdrop-blur-md rounded-[2.25rem] mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-white/45 p-2 overflow-hidden select-none transition-transform duration-500 hover:scale-105">
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
              <label className="text-[10px] font-bold text-slate-650 uppercase tracking-widest pl-1">
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
              <label className="text-[10px] font-bold text-slate-650 uppercase tracking-widest pl-1">
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
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer uppercase tracking-widest"
            >
              {isRegistering ? "Já tenho uma conta" : "Não tenho uma conta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
