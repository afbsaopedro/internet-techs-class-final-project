CREATE TABLE devices (id SERIAL PRIMARY KEY, NAME TEXT NOT NULL, lat FLOAT NOT NULL, lon FLOAT NOT NULL);

CREATE TABLE readings (deviceId Integer,
DATE timestamp,
VALUE float8,
PRIMARY KEY(deviceId,
DATE),
FOREIGN KEY (deviceId) REFERENCES devices(id));

ALTER TABLE readings
    DROP CONSTRAINT readings_deviceid_fkey,
    ADD CONSTRAINT readings_deviceid_fkey FOREIGN KEY (deviceid)
          REFERENCES devices (id) ON DELETE CASCADE;