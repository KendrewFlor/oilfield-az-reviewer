"""Tests for the study data and the worked-problem answers."""
import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools"))
import check_data as cd  # noqa: E402


class DataTests(unittest.TestCase):
    def test_validator_passes(self):
        self.assertEqual(cd.validate(), [])

    def test_all_twenty_disciplines_have_terms(self):
        codes = {d["code"] for d in cd.load("disciplines")["disciplines"]}
        used = {c for t in cd.load("terms") for c in t["disc"]}
        self.assertEqual(codes, used)

    def test_one_definition_per_term(self):
        terms = cd.load("terms")
        self.assertEqual(len({cd.term_id(t["term"]) for t in terms}), len(terms))
        self.assertTrue(all(isinstance(t["def"], str) for t in terms))

    def test_term_id_rule(self):
        self.assertEqual(cd.term_id("P90, P50 and P10"), "p90-p50-and-p10")
        self.assertEqual(cd.term_id("CO2 flooding"), "co2-flooding")


class WorkedAnswers(unittest.TestCase):
    """Recompute each worked problem's answer independently of the text in exercises.json."""

    def answer(self, pid):
        return next(p for p in cd.load("exercises")["problems"] if p["id"] == pid)["answer"]["value"]

    def close(self, pid, value, rel=0.01):
        self.assertTrue(math.isclose(self.answer(pid), value, rel_tol=rel), f"{pid}: {self.answer(pid)} vs {value}")

    def test_answers(self):
        self.close("kill-mud", 10.4 + 450 / (0.052 * 9800))
        self.close("barite", 1470 * 1.5 / 23.5 * 6)
        self.close("ecd", 11.0 + 280 / (0.052 * 12000))
        phi = (2.65 - 2.40) / 1.65
        self.close("archie", math.sqrt(0.04 / (phi ** 2 * 25)), 0.02)
        self.close("ooip", 7758 * 1200 * 45 * 0.18 * 0.70 / 1.25 / 1e6)
        self.close("giip", 43560 * 800 * 60 * 0.15 * 0.75 / 0.0045 / 1e9)
        v = lambda r: 1 - 0.2 * r - 0.8 * r * r
        self.close("vogel", 600 / v(0.72) * v(0.4))
        k = 162.6 * 250 * 1.15 * 0.9 / (35 * 40)
        s = 1.151 * ((3350 - 2900) / 35 - math.log10(k / (0.18 * 0.9 * 1.5e-5 * 0.33 ** 2)) + 3.23)
        self.close("buildup", s, 0.03)
        self.close("decline", math.log(10) / math.log(1000 / 800))
        self.close("npv", -10 + 3.5 * (1 - 1.1 ** -5) / 0.1)
        self.close("seismic-depth", 2800 * 1.8 / 2)
        self.close("refl-coef", (2.1 * 2500 - 2.4 * 2800) / (2.1 * 2500 + 2.4 * 2800), 0.02)
        self.close("api-gor", 141.5 / 0.85 - 131.5)
        self.close("underbalance", 3700 / (0.052 * 8000))
        self.close("tubing-volume", 2.441 ** 2 / 1029.4 * 10000)
        self.close("mobility", (0.3 / 0.5) / (0.8 / 5))
        self.close("holdup", (0.93 - 0.78) / (1.03 - 0.78))
        self.close("langmuir", 100 * 3000 / 3600)
        self.close("sor", 3.0)


if __name__ == "__main__":
    unittest.main()
