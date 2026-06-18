<?php

if (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'testing' || defined('PHPUNIT_COMPOSER_INSTALL') || defined('PEST_COMPOSER_INSTALL') || in_array('test', $_SERVER['argv'] ?? [])) {
    http_response_code(403);
    die("\nCRITICAL SECURITY ERROR: Testing is strictly disabled in this environment to safeguard the database.\n\n");
}

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->wantsJson(),
        );

        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Error de validación de datos.',
                        'error_code' => 'VALIDATION_ERROR',
                        'details' => $e->errors()
                    ], 422);
                }

                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No autenticado en el sistema.',
                        'error_code' => 'UNAUTHENTICATED'
                    ], 401);
                }

                if ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Recurso no encontrado.',
                        'error_code' => 'NOT_FOUND'
                    ], 404);
                }

                $code = 500;
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                    $code = $e->getStatusCode();
                }

                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage() ?: 'Error interno del servidor.',
                    'error_code' => 'SERVER_ERROR',
                    'details' => config('app.debug') ? ['exception' => get_class($e), 'file' => $e->getFile(), 'line' => $e->getLine()] : null
                ], $code);
            }
        });
    })->create();
