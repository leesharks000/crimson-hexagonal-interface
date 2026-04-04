-- HEXAGONAL OS — SUPABASE SCHEMA (Phase B)
-- Run this in Supabase SQL Editor after creating the project

-- Trails: ordered reading paths through the archive
CREATE TABLE IF NOT EXISTS trails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  doc_ids JSONB NOT NULL DEFAULT '[]',   -- ordered array of document IDs
  created_by TEXT DEFAULT 'MANUS',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'GENERATED' CHECK (status IN ('GENERATED','QUEUED','PROVISIONAL','DEPOSITED','RATIFIED'))
);

-- Annotations: notes attached to documents
CREATE TABLE IF NOT EXISTS annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id TEXT NOT NULL,                  -- references canonical JSON document ID
  room_id TEXT,                          -- optional room context
  content TEXT NOT NULL,
  author TEXT DEFAULT 'MANUS',
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'GENERATED' CHECK (status IN ('GENERATED','QUEUED','PROVISIONAL','DEPOSITED','RATIFIED'))
);

-- Proposals: governance proposals pending review
CREATE TABLE IF NOT EXISTS proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  proposal_type TEXT DEFAULT 'general' CHECK (proposal_type IN ('status_promotion','new_room','new_relation','amendment','deposit','general')),
  target_id TEXT,                        -- ID of the object being proposed on
  target_type TEXT,                      -- 'document', 'room', 'relation', etc.
  submitted_by TEXT DEFAULT 'MANUS',
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'GENERATED' CHECK (status IN ('GENERATED','QUEUED','PROVISIONAL','DEPOSITED','RATIFIED','REJECTED')),
  votes JSONB DEFAULT '[]',             -- array of {witness, vote, timestamp}
  bearing_cost REAL DEFAULT 0
);

-- Witness Actions: append-only ledger
CREATE TABLE IF NOT EXISTS witness_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  witness TEXT NOT NULL,                 -- TACHYON, LABOR, PRAXIS, etc.
  action_type TEXT NOT NULL,             -- 'attest', 'reject', 'review', 'promote', 'comment'
  target_id TEXT,
  target_type TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Session objects: generated content from runtime sessions
CREATE TABLE IF NOT EXISTS session_objects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  room_id TEXT,
  object_type TEXT DEFAULT 'text',       -- 'text', 'operator_result', 'lp_output', 'diagnosis'
  content TEXT NOT NULL,
  mantle TEXT,
  mode TEXT,
  lp_state JSONB,                        -- snapshot of ⟨σ,ε,Ξ,ψ⟩ at generation
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'GENERATED' CHECK (status IN ('GENERATED','QUEUED','PROVISIONAL','DEPOSITED','RATIFIED'))
);

-- Row Level Security: public read, authenticated write
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE witness_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_objects ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read trails" ON trails FOR SELECT USING (true);
CREATE POLICY "Public read annotations" ON annotations FOR SELECT USING (true);
CREATE POLICY "Public read proposals" ON proposals FOR SELECT USING (true);
CREATE POLICY "Public read witness_actions" ON witness_actions FOR SELECT USING (true);
CREATE POLICY "Public read session_objects" ON session_objects FOR SELECT USING (true);

-- Anon insert policies (for the interface — no auth required for MVP)
CREATE POLICY "Anon insert trails" ON trails FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon insert annotations" ON annotations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon insert proposals" ON proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon insert witness_actions" ON witness_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon insert session_objects" ON session_objects FOR INSERT WITH CHECK (true);

-- Anon update policies (for trail editing, proposal votes)
CREATE POLICY "Anon update trails" ON trails FOR UPDATE USING (true);
CREATE POLICY "Anon update proposals" ON proposals FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_annotations_doc ON annotations(doc_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_session_objects_room ON session_objects(room_id);
CREATE INDEX IF NOT EXISTS idx_witness_actions_target ON witness_actions(target_id);
