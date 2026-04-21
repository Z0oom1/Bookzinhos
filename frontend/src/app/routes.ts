import { createBrowserRouter } from "react-router";
import { AuthWrapper } from "./components/AuthWrapper";
import { RootLayout } from "./components/RootLayout";
import { Home } from "./pages/Home";
import { Library } from "./pages/Library";
import { MyBooks } from "./pages/MyBooks";
import { Notes } from "./pages/Notes";
import { Profile } from "./pages/Profile";
import { BookReader } from "./pages/BookReader";
import { BookDetails } from "./pages/BookDetails";
import { Upload } from "./pages/Upload";
import { Social } from "./pages/Social";
import { UserProfile } from "./pages/UserProfile";
import { Chat } from "./pages/Chat";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AuthWrapper,
    children: [
      {
        path: "/",
        Component: RootLayout,
        children: [
          { index: true, Component: Home },
          { path: "library", Component: Library },
          { path: "my-books", Component: MyBooks },
          { path: "notes", Component: Notes },
          { path: "profile", Component: Profile },
          { path: "book/:id", Component: BookDetails },
          { path: "upload", Component: Upload },
          { path: "social", Component: Social },
          { path: "user/:username", Component: UserProfile },
          { path: "chat/:otherUser", Component: Chat },
        ],
      },
      {
        path: "/read/:id",
        Component: BookReader,
      },
    ],
  },
]);
