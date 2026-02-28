ALTER TABLE requests
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN poster_outcome TEXT,
ADD COLUMN poster_meet_again BOOLEAN,
ADD COLUMN peer_outcome TEXT,
ADD COLUMN peer_meet_again BOOLEAN;
