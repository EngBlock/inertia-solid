<?php

return [
    'ssr' => [
        'enabled' => false,
    ],
    'pages' => [
        'ensure_pages_exist' => false,
        'paths' => [resource_path('js/Pages')],
        'extensions' => ['js', 'jsx', 'ts', 'tsx'],
    ],
    'testing' => [
        'ensure_pages_exist' => true,
    ],
    'expose_shared_prop_keys' => true,
    'history' => [
        'encrypt' => false,
    ],
    'devtools' => [
        'enabled' => false,
    ],
];
