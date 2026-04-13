// src/features/admin/pages/CreateUser.jsx
import CreateUserForm from '../../feature/admin/components/CreateUserForm';

export default function CreateUser() {
  return (
    <div className="max-w-90 mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
         Create New User
      </h1>
      <CreateUserForm />
    </div>
  );
}
