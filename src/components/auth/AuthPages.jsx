import { useState } from "react";
import {
  Lock,
  User,
  ArrowRight,
  Scissors,
  Eye,
  EyeOff,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { loginUser } from "../../redux/slices/authSlice";

const AuthPages = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const result = await dispatch(
        loginUser({
          username: data.username, // 🔥 IMPORTANT
          password: data.password,
        })
      );

      if (loginUser.fulfilled.match(result)) {
        toast.success("Login Successful!");

        // token already stored in slice

        navigate("/");
      } else {
        toast.error(result.payload || "Login failed");
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-md border border-gray-200 overflow-hidden">

        {/* HEADER */}
        <div className="bg-black p-6 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Scissors size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Aaraa Admin Portal</h1>
          <p className="mt-1">Sign in to your account</p>
        </div>

        {/* FORM */}
        <form className="p-6" onSubmit={handleSubmit(onSubmit)}>

          {/* USERNAME */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>

            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />

              <input
                {...register("username", {
                  required: "Username is required",
                })}
                className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-black"
                placeholder="admin"
              />
            </div>

            {errors.username && (
              <p className="text-red-500 text-sm mt-1">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* PASSWORD */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />

              <input
                type={showPassword ? "text" : "password"}
                {...register("password", {
                  required: "Password is required",
                })}
                className="w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-black"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* BUTTON */}
          <button className="w-full bg-black text-white py-2 rounded-md flex justify-center items-center">
            Sign In <ArrowRight size={16} className="ml-2" />
          </button>

        </form>
      </div>
    </div>
  );
};

export default AuthPages;