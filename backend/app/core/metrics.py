import asyncio
from collections import defaultdict


class HttpMetrics:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._requests: dict[tuple[str, str, int], int] = defaultdict(int)
        self._durations: dict[tuple[str, str], list[float]] = defaultdict(list)

    async def observe(self, method: str, path: str, status_code: int, duration: float) -> None:
        async with self._lock:
            self._requests[(method, path, status_code)] += 1
            samples = self._durations[(method, path)]
            samples.append(duration)
            if len(samples) > 10_000:
                del samples[:5_000]

    async def render(self) -> str:
        async with self._lock:
            request_items = list(self._requests.items())
            duration_items = [(key, list(values)) for key, values in self._durations.items()]

        lines = [
            "# HELP fiq_http_requests_total Total de solicitudes HTTP.",
            "# TYPE fiq_http_requests_total counter",
        ]
        for (method, path, status_code), count in sorted(request_items):
            lines.append(
                f'fiq_http_requests_total{{method="{method}",path="{path}",status="{status_code}"}} {count}'
            )
        lines.extend([
            "# HELP fiq_http_request_duration_seconds Duracion de solicitudes HTTP.",
            "# TYPE fiq_http_request_duration_seconds histogram",
        ])
        buckets = (0.1, 0.25, 0.5, 1.0, 2.5, 5.0)
        for (method, path), values in sorted(duration_items):
            labels = f'method="{method}",path="{path}"'
            for bucket in buckets:
                count = sum(value <= bucket for value in values)
                lines.append(
                    f'fiq_http_request_duration_seconds_bucket{{{labels},le="{bucket}"}} {count}'
                )
            lines.append(
                f'fiq_http_request_duration_seconds_bucket{{{labels},le="+Inf"}} {len(values)}'
            )
            lines.append(f"fiq_http_request_duration_seconds_sum{{{labels}}} {sum(values):.6f}")
            lines.append(f"fiq_http_request_duration_seconds_count{{{labels}}} {len(values)}")
        return "\n".join(lines) + "\n"


http_metrics = HttpMetrics()
