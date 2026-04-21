<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Python executable
    |--------------------------------------------------------------------------
    | The command used to invoke Python. On Windows this is usually 'python'
    | or 'py'; on Linux/macOS it may be 'python3'.
    */
    'python_bin' => env('THUMBMARK_PYTHON_BIN', 'python'),

    /*
    |--------------------------------------------------------------------------
    | Process timeout (seconds)
    |--------------------------------------------------------------------------
    | Maximum seconds to wait for the SourceAFIS Python process to complete.
    | Increase if you have a large gallery (many enrolled documents).
    */
    'timeout' => (int) env('THUMBMARK_TIMEOUT', 120),

    /*
    |--------------------------------------------------------------------------
    | Match threshold
    |--------------------------------------------------------------------------
    | Minimum SourceAFIS score to consider a fingerprint a positive match.
    | SourceAFIS recommends 40 as the standard threshold.
    */
    'threshold' => (int) env('THUMBMARK_THRESHOLD', 40),

];
