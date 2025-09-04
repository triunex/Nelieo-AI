import { RouterProvider, createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: "/",
    element: <div>Hello World</div>
  }
]);

<RouterProvider
  router={router}
  future={{
    v7_startTransition: true
  }}
/>;
