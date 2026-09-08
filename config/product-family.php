<?php

return [
    'products' => [
        'file' => [
            'name' => 'File. Set. Go.',
            'description' => 'Website-ready file preparation',
            'status' => 'current',
            'url' => null,
            'contexts' => [],
        ],
        'site' => [
            'name' => 'Site. Set. Go.',
            'description' => 'Website launch readiness',
            'status' => 'coming-soon',
            'url' => env('SITE_SET_GO_URL'),
            'contexts' => ['website-image', 'guided-fit', 'quick-fit'],
        ],
        'brand' => [
            'name' => 'Brand. Set. Go.',
            'description' => 'Brand asset readiness',
            'status' => 'coming-soon',
            'url' => env('BRAND_SET_GO_URL'),
            'contexts' => ['logo-pack', 'transparent-logo', 'favicon'],
        ],
        'shop' => [
            'name' => 'Shop. Set. Go.',
            'description' => 'Online-store readiness',
            'status' => 'coming-soon',
            'url' => env('SHOP_SET_GO_URL'),
            'contexts' => ['ecommerce'],
        ],
    ],
];
