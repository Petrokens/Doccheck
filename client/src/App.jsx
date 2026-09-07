import AppRoutes from './routes';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster position="top-center" />
    </>
  );
}
