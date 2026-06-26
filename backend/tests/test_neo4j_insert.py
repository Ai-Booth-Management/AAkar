"""Tests for graph_builder (voter / complaint processing)."""

from unittest.mock import patch


@patch("app.domain.services.graph_builder.neo4j_client")
def test_process_voters_returns_count(mock_client, sample_voters_df):
    """process_voters should return the number of rows processed."""
    mock_client.run_query.return_value = []
    from app.domain.services.graph_builder import process_voters

    result = process_voters(sample_voters_df)
    assert result == {"voters_processed": 2}
    assert mock_client.run_query.call_count == 1  # one batch call


@patch("app.domain.services.graph_builder.neo4j_client")
def test_process_voters_query_params(mock_client, sample_voters_df):
    """Verify that process_voters sends correct params to Neo4j."""
    mock_client.run_query.return_value = []
    from app.domain.services.graph_builder import process_voters

    process_voters(sample_voters_df)

    # Check first call's parameters
    _, kwargs = mock_client.run_query.call_args_list[0]
    params = kwargs.get("parameters") or mock_client.run_query.call_args_list[0][0][1]
    batch = params["batch"]
    assert len(batch) == 2
    assert batch[0]["epic"] == "ABC1234567"
    assert batch[0]["name"] == "Test User One"
    assert batch[0]["age"] == 30
    assert batch[0]["gender"] == "Male"
    assert batch[0]["booth_id"] == "MH_123_001"


@patch("app.domain.services.graph_enrichment.neo4j_client")
@patch("app.domain.services.voter_segmentation.neo4j_client")
@patch("app.domain.services.recommendation_engine.neo4j_client")
@patch("app.domain.services.risk_engine.neo4j_client")
@patch("app.domain.services.graph_builder.neo4j_client")
def test_process_complaints_returns_count(
    mock_builder_client,
    mock_risk_client,
    mock_rec_client,
    mock_seg_client,
    mock_enrich_client,
    sample_complaints_df,
):
    """process_complaints should return the number of rows processed."""
    mock_builder_client.run_query.return_value = []
    mock_risk_client.run_query.return_value = []
    mock_rec_client.run_query.return_value = []
    mock_seg_client.run_query.return_value = []
    mock_enrich_client.run_query.return_value = []
    from app.domain.services.graph_builder import process_complaints

    result = process_complaints(sample_complaints_df)
    assert result == {"complaints_processed": 2}
