import io
import tempfile
from pathlib import Path
from typing import List
import os

from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd

from app.domain.services.graph_builder import process_voters, process_complaints

router = APIRouter()

UPLOADS_DIR = Path(__file__).resolve().parents[4] / "data" / "uploads"
API_UPLOAD_IN_PROGRESS = False


@router.post("")
async def upload_csv(file: UploadFile = File(...), file_type: str = "voters"):
    """Upload a CSV file and process it into the graph."""
    try:
        global API_UPLOAD_IN_PROGRESS
        API_UPLOAD_IN_PROGRESS = True
        
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        # Save uploaded CSV to disk
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        csv_path = UPLOADS_DIR / f"{file_type}.csv"
        df.to_csv(csv_path, index=False)

        if file_type == "voters":
            result = process_voters(df)
        elif file_type == "complaints":
            result = process_complaints(df)
        else:
            raise HTTPException(status_code=400, detail="Invalid file_type")

        return {"status": "success", "details": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        API_UPLOAD_IN_PROGRESS = False


@router.post("/pdf")
async def upload_pdf(files: List[UploadFile] = File(...)):
    """Upload multiple voter PDFs → convert to CSV via OCR → process into graph."""
    from app.domain.services.pdf_converter import process_pdf
    
    all_dfs = []

    try:
        global API_UPLOAD_IN_PROGRESS
        API_UPLOAD_IN_PROGRESS = True
        
        for file in files:
            if not file.filename.lower().endswith(".pdf"):
                continue

            contents = await file.read()
            with tempfile.NamedTemporaryFile(
                suffix=".pdf", delete=False, mode="wb"
            ) as tmp:
                tmp.write(contents)
                tmp_path = tmp.name

            try:
                df = process_pdf(tmp_path)
                if not df.empty:
                    all_dfs.append(df)
            finally:
                os.unlink(tmp_path)

        if not all_dfs:
            return {
                "status": "success",
                "records_extracted": 0,
                "message": "No voter records could be extracted from the provided PDFs.",
            }

        combined_df = pd.concat(all_dfs, ignore_index=True)

        # Save as voters.csv (triggers auto-update watcher too)
        csv_path = UPLOADS_DIR / "voters.csv"
        
        if csv_path.exists():
            try:
                existing_df = pd.read_csv(csv_path)
                if not existing_df.empty:
                    final_df = pd.concat([existing_df, combined_df], ignore_index=True)
                    if "epic" in final_df.columns:
                        final_df = final_df.drop_duplicates(subset=["epic"], keep="last")
                else:
                    final_df = combined_df
            except pd.errors.EmptyDataError:
                final_df = combined_df
        else:
            final_df = combined_df
            
        final_df.to_csv(csv_path, index=False)

        # Process into graph immediately
        result = process_voters(combined_df)

        return {
            "status": "success",
            "records_extracted": len(combined_df),
            "processing_result": result,
            "message": (
                f"Successfully extracted {len(combined_df)} voter records "
                f"from {len(files)} PDFs and loaded into the database."
            ),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF batch processing failed: {str(e)}",
        )
    finally:
        API_UPLOAD_IN_PROGRESS = False

