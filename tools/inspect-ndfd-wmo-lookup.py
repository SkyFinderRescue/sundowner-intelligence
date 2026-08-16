#!/usr/bin/env python3
import json
import os
import urllib.request
from pathlib import Path

import pandas as pd

URL = "https://noaa-ndfd-pds.s3.amazonaws.com/NDFDelem_fullres_202206.xls"
OUT = Path(os.environ.get("OUT", "research/ndfd-wmo-lookup-inspection.json"))
TMP = Path("/tmp/NDFDelem_fullres_202206.xls")
urllib.request.urlretrieve(URL, TMP)

xls = pd.ExcelFile(TMP, engine="xlrd")
result = {
    "status": "RESEARCH_ONLY_DO_NOT_LOAD_IN_PRODUCTION",
    "source_url": URL,
    "sheets": [],
    "candidate_rows": [],
}
terms = ["gust", "wind", "california", "conus", "pacific", "kwbn", "wgust", "wspd", "wdir"]

for sheet in xls.sheet_names:
    df = pd.read_excel(TMP, sheet_name=sheet, engine="xlrd", header=None, dtype=str).fillna("")
    result["sheets"].append({
        "name": sheet,
        "rows": int(df.shape[0]),
        "cols": int(df.shape[1]),
        "head": df.head(12).values.tolist(),
    })
    for i, row in df.iterrows():
        vals = [str(v) for v in row.tolist()]
        text = " | ".join(vals).lower()
        if any(t in text for t in terms):
            result["candidate_rows"].append({"sheet": sheet, "row": int(i) + 1, "values": vals})

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"sheets": result["sheets"], "candidate_rows": result["candidate_rows"][:80], "candidate_count": len(result["candidate_rows"])}, indent=2))
