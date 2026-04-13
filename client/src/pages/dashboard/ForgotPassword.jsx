export default function ForgotPassword() {
  return (
    <div className="p-4 max-w-lg">
      <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-4">Reset Your Password</h1>
      <p className="text-gray-700 dark:text-gray-300 mb-2">Enter your new password below:</p>
      <form className="space-y-4">
        <input type="password" placeholder="New password" className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" />
        <input type="password" placeholder="Confirm password" className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" />
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Update Password</button>
      </form>
    </div>
  );
}
