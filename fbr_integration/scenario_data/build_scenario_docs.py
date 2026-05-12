import json
import re
from pathlib import Path

SOURCE_DIR = Path(__file__).resolve().parent / "source"
SOURCE_TEXT_FILE = SOURCE_DIR / "DI_Scenarios_Summary.txt"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "public" / "scenario_docs"


def parse_scenarios(raw_text):
	scenarios = []
	parts = re.split(r"\n(?=SN\d{3}:)", raw_text.strip())

	for part in parts:
		part = part.strip()
		if not part:
			continue

		lines = part.splitlines()
		header = lines[0].strip()
		match = re.match(r"^(SN\d{3}):\s*(.+)$", header)
		if not match:
			continue

		scenario_id = match.group(1)
		title = match.group(2).strip()
		json_start = part.find("{")
		json_end = part.rfind("}") + 1

		if json_start == -1 or json_end <= json_start:
			raise ValueError(f"Missing JSON payload for {scenario_id}")

		description = part[len(header) : json_start].strip()
		sample = json.loads(part[json_start:json_end])
		scenarios.append(
			{
				"id": scenario_id,
				"title": title,
				"description": description,
				"sample": sample,
			}
		)

	return scenarios


def write_scenarios(scenarios):
	OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

	for scenario in scenarios:
		output_file = OUTPUT_DIR / f"{scenario['id']}.json"
		output_file.write_text(json.dumps(scenario, indent=2) + "\n", encoding="utf-8")

	index_data = [
		{
			"id": scenario["id"],
			"title": scenario["title"],
			"description": scenario["description"],
		}
		for scenario in scenarios
	]
	index_file = OUTPUT_DIR / "index.json"
	index_file.write_text(json.dumps(index_data, indent=2) + "\n", encoding="utf-8")


def main():
	raw_text = SOURCE_TEXT_FILE.read_text(encoding="utf-8")
	scenarios = parse_scenarios(raw_text)
	write_scenarios(scenarios)
	print(f"Built {len(scenarios)} scenario document files in {OUTPUT_DIR}")


if __name__ == "__main__":
	main()
