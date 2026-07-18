<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    /**
     * Get a JWT via given credentials.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (! auth('api')->validate($credentials)) {
            return $this->errorResponse('Credenciales inválidas.', 'UNAUTHORIZED', null, 401);
        }

        $user = \App\Models\User::where('email', $credentials['email'])->first();
        
        $isAdmin = $user->roles->contains(function ($role) {
            return str_contains(strtolower($role->name), 'admin');
        });

        // Eterna para admins (10 años), 1 semana para otros
        $ttl = $isAdmin ? 5256000 : 10080;
        auth('api')->factory()->setTTL($ttl);

        $token = auth('api')->login($user);

        ActivityLogger::log('login', "Inició sesión {$user->email}", 'user', (string)$user->id);

        return $this->respondWithToken($token);
    }

    /**
     * Get the authenticated User.
     */
    public function me()
    {
        return $this->successResponse(auth('api')->user()->load(['roles', 'business:id,name']));
    }

    /**
     * Log the user out (Invalidate the token).
     */
    public function logout()
    {
        $user = auth('api')->user();
        auth('api')->logout();

        if ($user) {
            ActivityLogger::log('logout', "Cerró sesión {$user->email}", 'user', (string)$user->id);
        }

        return $this->successResponse(null, 'Sesión cerrada exitosamente.');
    }

    /**
     * Refresh a token.
     */
    public function refresh()
    {
        try {
            $user = auth('api')->user();
            if ($user) {
                $isAdmin = $user->roles->contains(function ($role) {
                    return str_contains(strtolower($role->name), 'admin');
                });
                $ttl = $isAdmin ? 5256000 : 10080;
                auth('api')->factory()->setTTL($ttl);

                ActivityLogger::log('refresh', "Refrescó token de sesión {$user->email}", 'user', (string)$user->id);
            }
            
            return $this->respondWithToken(auth('api')->refresh());
        } catch (\PHPOpenSourceSaver\JWTAuth\Exceptions\JWTException $e) {
            return $this->errorResponse('No se pudo refrescar el token: ' . $e->getMessage(), 'UNAUTHENTICATED', null, 401);
        }
    }

    /**
     * Get the token array structure.
     */
    protected function respondWithToken($token)
    {
        return $this->successResponse([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => auth('api')->user()->load(['roles', 'business:id,name'])
        ], 'Autenticación exitosa.');
    }
}
