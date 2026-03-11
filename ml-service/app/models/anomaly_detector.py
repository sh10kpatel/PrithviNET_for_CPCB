"""Anomaly detection using Isolation Forest and Z-score methods."""

import numpy as np
from sklearn.ensemble import IsolationForest


def detect_isolation_forest(
    values: list[float],
    contamination: float = 0.05,
) -> list[dict]:
    """Isolation Forest anomaly detection on a readings array.

    Args:
        values: List of numeric reading values.
        contamination: Expected proportion of anomalies (0-0.5).

    Returns:
        List of dicts with index, value, anomaly_score, is_anomaly.
    """
    arr = np.array(values).reshape(-1, 1)
    model = IsolationForest(contamination=contamination, random_state=42)
    model.fit(arr)

    scores = model.decision_function(arr)
    labels = model.predict(arr)  # 1 = normal, -1 = anomaly

    # Normalize scores to 0-1 (higher = more anomalous)
    score_range = scores.max() - scores.min() + 1e-10
    norm_scores = 1 - (scores - scores.min()) / score_range

    return [
        {
            "index": i,
            "value": float(values[i]),
            "anomaly_score": round(float(norm_scores[i]), 4),
            "is_anomaly": bool(labels[i] == -1),
        }
        for i in range(len(values))
    ]


def detect_zscore(
    values: list[float],
    threshold: float = 3.0,
) -> list[dict]:
    """Z-score based anomaly detection (lightweight fallback).

    Args:
        values: List of numeric reading values.
        threshold: Z-score threshold for anomaly classification.

    Returns:
        List of dicts with index, value, anomaly_score, is_anomaly.
    """
    arr = np.array(values)
    mean, std = float(arr.mean()), float(arr.std())

    if std == 0:
        return [
            {
                "index": i,
                "value": float(v),
                "anomaly_score": 0.0,
                "is_anomaly": False,
            }
            for i, v in enumerate(values)
        ]

    z_scores = np.abs((arr - mean) / std)
    norm_scores = np.clip(z_scores / (threshold * 1.5), 0.0, 1.0)

    return [
        {
            "index": i,
            "value": float(values[i]),
            "anomaly_score": round(float(norm_scores[i]), 4),
            "is_anomaly": bool(z_scores[i] > threshold),
        }
        for i in range(len(values))
    ]
