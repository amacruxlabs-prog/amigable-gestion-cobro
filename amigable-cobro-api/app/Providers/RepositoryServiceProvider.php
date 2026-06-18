<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Interfaces\TransactionRepositoryInterface;
use App\Repositories\TransactionRepository;
use App\Decorators\CachedTransactionRepository;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->bind(TransactionRepositoryInterface::class, function ($app) {
            // Se inyecta el repositorio real dentro del decorador de caché
            $baseRepo = new TransactionRepository();
            return new CachedTransactionRepository($baseRepo);
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
