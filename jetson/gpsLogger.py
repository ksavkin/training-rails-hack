import gps
import json
import threading
import time
from datetime import datetime

class GPSLogger:
    def __init__(self, output_file="gps_data.json"):
        self.output_file = output_file
        self.running = True
        self.current_data = {
            "timestamp": None,
            "lat": 0.0,
            "lon": 0.0,
            "alt": 0.0,
            "speed": 0.0,
            "fix": 0
        }
        
        # Connect to the local gpsd daemon
        try:
            self.session = gps.gps(mode=gps.WATCH_ENABLE)
        except Exception as e:
            print(f"Error connecting to gpsd: {e}")
            exit(1)

    def update_gps(self):
        """Background thread to poll GPS device."""
        while self.running:
            try:
                report = self.session.next()
                # Wait for a TPV (Time Position Velocity) report
                if report['class'] == 'TPV':
                    self.current_data = {
                        "timestamp": getattr(report, 'time', datetime.now().isoformat()),
                        "unix_time": time.time(), # Critical for syncing with video frames
                        "lat": getattr(report, 'lat', 0.0),
                        "lon": getattr(report, 'lon', 0.0),
                        "alt": getattr(report, 'alt', 0.0),
                        "speed": getattr(report, 'speed', 0.0),
                        "fix": getattr(report, 'mode', 0)
                    }
            except StopIteration:
                break
            except Exception as e:
                print(f"GPS Thread Error: {e}")

    def start_logging(self, interval=0.1):
        """Saves current GPS state to JSON at a set frequency."""
        gps_thread = threading.Thread(target=self.update_gps, daemon=True)
        gps_thread.start()
        
        print(f"Logging started. Saving to {self.output_file}...")
        
        data_log = []
        
        try:
            while True:
                # Capture the 'moment'
                entry = self.current_data.copy()
                data_log.append(entry)
                
                # Print status to console
                if entry['fix'] > 1:
                    print(f"Fix: {entry['lat']}, {entry['lon']} | Speed: {entry['speed']} m/s", end='\r')
                else:
                    print("Waiting for GPS fix...", end='\r')
                
                time.sleep(interval) # 10Hz logging
                
        except KeyboardInterrupt:
            print("\nStopping and saving data...")
            self.running = False
            with open(self.output_file, 'w') as f:
                json.dump(data_log, f, indent=4)
            print("Done.")

if __name__ == "__main__":
    logger = GPSLogger("rail_survey_gps.json")
    logger.start_logging(interval=0.033) # Match 30fps video (~33ms)