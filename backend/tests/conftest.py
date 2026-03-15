import os

import pytest


@pytest.fixture(scope="session", autouse=True)
def isolated_storage(tmp_path_factory):
    """Redirect every test session to a fresh storage directory.

    Guarantees that content-addressed upload tickets always start from
    exists=False, preventing inter-session state pollution when tests
    are run repeatedly without manual cleanup.
    """
    root = tmp_path_factory.mktemp("vitavision_storage")
    os.environ["STORAGE_MODE"] = "local"
    os.environ["LOCAL_STORAGE_ROOT"] = str(root)
    yield root
