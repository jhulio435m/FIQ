import re
import sys
from pathlib import Path

BACKEND_PATH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_PATH))

from app.main import app


DOCS_PATH = BACKEND_PATH.parent / "docs" / "05_especificacion_api.md"
ENDPOINT_RE = re.compile(r"`(GET|POST|PATCH|DELETE|PUT)\s+([^`]+)`")
PARAM_RE = re.compile(r"\{[^}/]+\}")


def normalize(path: str) -> str:
    path = path.strip()
    if path != "/" and path.endswith("/"):
        path = path[:-1]
    return PARAM_RE.sub("{}", path)


def endpoint_key(method: str, path: str) -> str:
    return f"{method.upper()} {normalize(path)}"


def real_endpoints() -> set[str]:
    endpoints: set[str] = set()
    for path, item in app.openapi()["paths"].items():
        for method in item:
            if method == "parameters":
                continue
            endpoints.add(endpoint_key(method, path))
    return endpoints


def documented_endpoints() -> set[str]:
    content = DOCS_PATH.read_text(encoding="utf-8")
    return {endpoint_key(method, path) for method, path in ENDPOINT_RE.findall(content)}


def main() -> int:
    real = real_endpoints()
    documented = documented_endpoints()
    missing = sorted(real - documented)
    stale = sorted(documented - real)

    if missing or stale:
        if missing:
            print("Endpoints reales no documentados:")
            for endpoint in missing:
                print(f"- {endpoint}")
        if stale:
            print("Endpoints documentados inexistentes:")
            for endpoint in stale:
                print(f"- {endpoint}")
        return 1

    print(f"OpenAPI docs aligned: {len(real)} endpoints documented.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
