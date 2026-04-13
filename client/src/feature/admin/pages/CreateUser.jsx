// src/features/admin/pages/CreateUser.jsx
import CreateUserForm from '../components/CreateUserForm';

export default function CreateUser() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-100 dark:bg-[#111215] transition-colors duration-300">
      <CreateUserForm />
    </div>
  );
}
