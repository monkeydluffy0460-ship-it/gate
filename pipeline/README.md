# GATE question extraction pipeline

Python 3.11 pipeline for extracting and preparing questions from GATE past-paper PDFs. Source PDFs, generated output, and cached model responses are kept out of Git.

## Set up

From the repository root:

```bash
cd pipeline
python3.11 -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Fill in the values in `.env`. Keep Groq and Supabase service-role credentials in this environment file only; never put them in the web app. Do not commit `.env` or source PDFs.

## Run

The extraction scripts are not scaffolded yet. Once added, activate the virtual environment and run the relevant script from this directory. Keep downloaded PDFs in `pdfs/`, generated files in `output/`, and raw Groq responses in `cache/`.
