import AppRoutes from './routes'
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <>
    
      <AppRoutes />
        <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1f1f2e',
            color: '#fff',
            border: '1px solid #9333ea',
            fontFamily: 'Poppins, sans-serif',
            marginTop: '80px',
          },
          success: {
            iconTheme: {
              primary: '#9333ea',
              secondary: '#fff',
            },
          },
        }}
      />
   
    </>
  )
}

export default App
