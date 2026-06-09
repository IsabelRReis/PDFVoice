import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, UserRole } from '../types';
import { Shield, BookOpen, Key, Mail, User as UserIcon, LogIn, ArrowRight } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres' }),
});

const registerSchema = z.object({
  name: z.string().min(3, { message: 'O nome de usuário deve ter no mínimo 3 caracteres' }),
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres' }),
  role: z.enum(['USER', 'ADMIN']),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

interface AuthScreensProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export function AuthScreens({ onAuthSuccess }: AuthScreensProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Login Form
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLogin
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  // Register Form
  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    reset: resetRegister
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: 'USER', role: 'USER' }
  });

  const onSubmitLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao fazer login.');
      }
      onAuthSuccess(resData.user, resData.token);
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitRegister = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao cadastrar usuário.');
      }
      onAuthSuccess(resData.user, resData.token);
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (email: string, pass: string) => {
    resetLogin({ email, password: pass });
    setServerError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-[#111114] p-8 rounded-2xl shadow-2xl border border-slate-850">
        <div>
          <div className="flex justify-center">
            <span className="p-3.5 bg-indigo-600/10 rounded-2xl text-indigo-400 border border-indigo-500/10">
              <BookOpen className="h-8 w-8" />
            </span>
          </div>
          <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-white font-sans">
            PDFVoice
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400 font-sans">
            {isLogin
              ? 'Acesse a sua biblioteca ou painel administrativo.'
              : 'Crie uma conta para começar a escutar e converter.'}
          </p>
        </div>

        {serverError && (
          <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl font-medium">
            {serverError}
          </div>
        )}

        {isLogin ? (
          <form className="mt-8 space-y-5" onSubmit={handleLoginSubmit(onSubmitLogin)}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    {...loginRegister('email')}
                    className="pl-9 w-full py-2.5 px-3 bg-[#16161a] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-slate-600 text-white transition-colors"
                    placeholder="exemplo@email.com"
                  />
                </div>
                {loginErrors.email && (
                  <p className="mt-1 text-xs text-red-450">{loginErrors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Key className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    {...loginRegister('password')}
                    className="pl-9 w-full py-2.5 px-3 bg-[#16161a] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-slate-600 text-white transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                {loginErrors.password && (
                  <p className="mt-1 text-xs text-red-450">{loginErrors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Autenticando...' : 'Entrar'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleRegisterSubmit(onSubmitRegister)}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    {...registerRegister('name')}
                    className="pl-9 w-full py-2.5 px-3 bg-[#16161a] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-slate-600 text-white transition-colors"
                    placeholder="Seu nome"
                  />
                </div>
                {registerErrors.name && (
                  <p className="mt-1 text-xs text-red-450">{registerErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    {...registerRegister('email')}
                    className="pl-9 w-full py-2.5 px-3 bg-[#16161a] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-slate-600 text-white transition-colors"
                    placeholder="exemplo@email.com"
                  />
                </div>
                {registerErrors.email && (
                  <p className="mt-1 text-xs text-red-450">{registerErrors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Key className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    {...registerRegister('password')}
                    className="pl-9 w-full py-2.5 px-3 bg-[#16161a] border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder-slate-600 text-white transition-colors"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                {registerErrors.password && (
                  <p className="mt-1 text-xs text-red-450">{registerErrors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Cadastrando...' : 'Cadastrar e Entrar'}
              </button>
            </div>
          </form>
        )}

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-850"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-wider">Alternar</span>
          <div className="flex-grow border-t border-slate-850"></div>
        </div>

        <div className="text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setServerError(null);
            }}
            className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            {isLogin ? 'Não possui uma conta? Registre-se já' : 'Já possui cadastro? Faça o Login'}
          </button>
        </div>

        {/* HELPFUL TEST BADGES ACCORDING TO SYSTEM PHILOSOPHY */}
        {isLogin && (
          <div className="mt-4 p-4 bg-[#16161a] rounded-xl border border-slate-850 text-slate-400 text-xs leading-relaxed space-y-1.5 font-sans">
            <div className="font-semibold text-slate-200 flex items-center">
              <Shield className="h-3.5 w-3.5 mr-1 text-indigo-400" />
              Acesso Rápido para Testes:
            </div>
            <div className="flex flex-col gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => fillCredentials('admin@audiobook.com', 'admin123')}
                className="text-left w-full hover:underline font-mono text-[11px] text-indigo-400"
              >
                Admin → admin@audiobook.com | admin123
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('user@audiobook.com', 'user123')}
                className="text-left w-full hover:underline font-mono text-[11px] text-teal-400"
              >
                User → user@audiobook.com | user123
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
