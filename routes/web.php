<?php

use App\Http\Controllers\SeoController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
})->name('home');

// Curated acquisition surfaces (FSG-007 directive §6). Each maps to an
// existing, already-certified product mode via `?mode=` deep-linking
// (directive §9) — no new processing behavior is introduced here.
Route::view('/prepare-logo-for-website', 'pages.prepare-logo')->name('prepare-logo');
Route::view('/transparent-logo-for-website', 'pages.transparent-logo')->name('transparent-logo');
Route::view('/favicon-generator', 'pages.favicon-generator')->name('favicon-generator');
Route::view('/website-image-optimizer', 'pages.website-image-optimizer')->name('website-image-optimizer');
Route::view('/compress-image-for-website', 'pages.compress-image')->name('compress-image');
Route::view('/convert-image-to-webp', 'pages.convert-webp')->name('convert-webp');

Route::view('/privacy', 'pages.privacy')->name('privacy');
Route::view('/terms', 'pages.terms')->name('terms');

Route::get('/sitemap.xml', [SeoController::class, 'sitemap'])->name('sitemap');
Route::get('/robots.txt', [SeoController::class, 'robots'])->name('robots');
