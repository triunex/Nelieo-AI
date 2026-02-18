import { RouterProvider, createBrowserRouter } from "react-router-dom";
import UniversalSearchDemo from "./pages/UniversalSearchDemo";

const router = createBrowserRouter([
  { path: "/", element: <div>Hello World</div> },
  { path: "/universal", element: <UniversalSearchDemo /> },
]);

<RouterProvider
  router={router}
  future={{
    v7_startTransition: true,
  }}
/>;
