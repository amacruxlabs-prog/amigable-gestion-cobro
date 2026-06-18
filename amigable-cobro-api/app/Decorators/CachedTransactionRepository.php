<?php

namespace App\Decorators;

use App\Interfaces\TransactionRepositoryInterface;
use App\Models\Transaction;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class CachedTransactionRepository implements TransactionRepositoryInterface
{
    private TransactionRepositoryInterface $repository;
    private int $cacheTTL = 3600; // 1 hora de caché

    public function __construct(TransactionRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getByBusiness(int $businessId): Collection
    {
        $cacheKey = "transactions.business.{$businessId}";

        return Cache::remember($cacheKey, $this->cacheTTL, function () use ($businessId) {
            return $this->repository->getByBusiness($businessId);
        });
    }

    public function findById(int $transactionId, int $businessId): ?Transaction
    {
        $cacheKey = "transaction.{$transactionId}.business.{$businessId}";

        return Cache::remember($cacheKey, $this->cacheTTL, function () use ($transactionId, $businessId) {
            return $this->repository->findById($transactionId, $businessId);
        });
    }

    public function create(array $data): Transaction
    {
        $transaction = $this->repository->create($data);
        
        // Invalidar caché general del negocio
        if (isset($data['business_id'])) {
            Cache::forget("transactions.business.{$data['business_id']}");
        }

        return $transaction;
    }

    public function update(int $transactionId, int $businessId, array $data): bool
    {
        $updated = $this->repository->update($transactionId, $businessId, $data);

        if ($updated) {
            Cache::forget("transactions.business.{$businessId}");
            Cache::forget("transaction.{$transactionId}.business.{$businessId}");
        }

        return $updated;
    }
}
