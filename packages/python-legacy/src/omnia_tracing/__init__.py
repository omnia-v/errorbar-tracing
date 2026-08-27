"""omnia_tracing is now errorbar_tracing.

Re-exports the renamed package so `from omnia_tracing import setup` keeps
working, and says so once. Switch your import; this shim will be removed in
a later release.
"""

import warnings

from errorbar_tracing import *  # noqa: F401,F403

warnings.warn(
    "omnia_tracing is renamed to errorbar_tracing — update your import; "
    "this shim will be removed in a later release.",
    DeprecationWarning,
    stacklevel=2,
)
