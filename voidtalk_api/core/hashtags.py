import re


HASHTAG_PATTERN = re.compile(r"(?<!\w)#([\w]{1,64})", re.UNICODE)


def extract_hashtag_names(text: str) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()

    for match in HASHTAG_PATTERN.finditer(text):
        name = match.group(1).strip("_").lower()
        if not name or name in seen:
            continue

        seen.add(name)
        names.append(name)

    return names
