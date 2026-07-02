import pytest
from sqlmodel import Session, select
from PIL import Image
import os
import io

from app.infrastructure.db.sqlite_client import engine
from app.domain.models.volunteer import Task, Volunteer
from app.domain.models.hierarchy import HierarchyNode
from app.api.v1.endpoints.forensics import run_forensic_pipeline, haversine

def test_haversine():
    # Verify distance calculation
    dist = haversine(77.2090, 28.6139, 77.2090, 28.6139)
    assert dist == 0.0

def test_forensics_pipeline():
    with Session(engine) as session:
        # Create a dummy hierarchy node for the booth
        booth = HierarchyNode(
            code="test-booth-code-1",
            name="Test Booth",
            level="booth",
            latitude=28.6139,
            longitude=77.2090
        )
        session.add(booth)
        
        # Create a dummy volunteer
        vol = Volunteer(
            name="Test Volunteer",
            phone="9988776655",
            status="active"
        )
        session.add(vol)
        session.commit()
        session.refresh(vol)
        
        # Create a dummy task
        task = Task(
            volunteer_id=vol.id,
            booth_id="test-booth-code-1",
            title="Test Task Title",
            status="assigned"
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        
        # Generate a dummy test image
        img = Image.new("RGB", (100, 100), color="blue")
        proof_path = f"data/uploads/task_proofs/test_{task.id}.jpg"
        os.makedirs(os.path.dirname(proof_path), exist_ok=True)
        img.save(proof_path, "JPEG")
        
        task.proof_image_path = proof_path
        session.add(task)
        session.commit()
        
        # Run pipeline
        report = run_forensic_pipeline(task.id, session)
        assert "authenticity_score" in report
        assert report["authenticity_score"] >= 0
        
        # Clean up files
        if os.path.exists(proof_path):
            os.remove(proof_path)
        for suffix in ["_ela.jpg", "_noise.jpg"]:
            p = proof_path.replace(".jpg", suffix)
            if os.path.exists(p):
                os.remove(p)
                
        # Clean up database records
        session.delete(task)
        session.delete(vol)
        session.delete(booth)
        session.commit()
