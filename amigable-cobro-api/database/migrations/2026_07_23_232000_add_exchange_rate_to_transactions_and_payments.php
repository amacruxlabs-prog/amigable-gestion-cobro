<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->decimal('exchange_rate', 12, 4)->nullable()->after('status');
            $table->decimal('amount_bs', 15, 2)->nullable()->after('exchange_rate');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->decimal('exchange_rate', 12, 4)->nullable()->after('amount');
            $table->decimal('amount_bs', 15, 2)->nullable()->after('exchange_rate');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['exchange_rate', 'amount_bs']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['exchange_rate', 'amount_bs']);
        });
    }
};
