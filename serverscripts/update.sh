#!/bin/bash
set -e  # Exit on error

export JAVA_HOME=/opt/java/jdk-23.0.2+7
export PATH=$JAVA_HOME/bin:$PATH
export PATH="$HOME/.nvm/versions/node/v23.11.0/bin:$PATH"


# Config
REPO_URL="git@github.com:Draggon01/exercise-counter.git"
PROJECT_DIR="/opt/exercise-counter/build/exercise-counter"
JAR_FILE_OLD=$(find /opt/exercise-counter -maxdepth 1 -type f -name "*.jar" -print -quit)
WEB_ROOT="/var/www/html"
FRONTEND_DIST_DIR="$PROJECT_DIR/frontend/dist"

echo "Starting deployment at $(date)"

# Clone or pull repo
if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "Cloning repository..."
  git clone $REPO_URL $PROJECT_DIR
else
  echo "Pulling latest changes..."
  cd $PROJECT_DIR
  git reset --hard
  git pull origin master
fi

cd $PROJECT_DIR

# Java backend build
echo "Building Java backend..."
./mvnw clean package -DskipTests

echo "copy jar to backend directory"
#JAR_FILE_OLD=$(find /opt/exercise-counter -type f -name "*.jar" -print -quit)

if [ -z "$JAR_FILE_OLD" ]; then
  echo "No Old JAR file found!"
else
  echo "Found old JAR file: $JAR_FILE_OLD"
  echo "Remove old Jar file"
  rm "$JAR_FILE_OLD"
fi

JAR_FILE=$(find $PROJECT_DIR/target -type f -name "*.jar" -print -quit)
# Check if JAR file is found
if [ -z "$JAR_FILE" ]; then
  echo "No JAR file found!"
  exit 1
else
  echo "Found JAR file: $JAR_FILE"
  echo "Copying JAR file to $DESTINATION_DIR"
  cp "$JAR_FILE" "/opt/exercise-counter"
fi


# Frontend build
echo "Building frontend..."
cd frontend
npm install
npm run build

# Remove old dist files
echo "Cleaning up $WEB_ROOT"
sudo rm -rf ${WEB_ROOT:?}/*

# copy new dist files
echo "Copying frontend build to $WEB_ROOT"
sudo cp -r $FRONTEND_DIST_DIR/* $WEB_ROOT/

# restart backend
NEW_JAR_FILE=$(find /opt/exercise-counter -maxdepth 1 -type f -name "*.jar" -print -quit)
PID_FILE="/opt/exercise-counter/backend.pid"
LOG_FILE="/opt/exercise-counter/backend.log"

if [ -z "$NEW_JAR_FILE" ]; then
   echo "No Executable JAR file to restart with found!"
   exit 1
fi

# Stop if running

# Stop if running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if [ -n "$PID" ]; then
        if ps -p "$PID" > /dev/null; then
            echo "Stopping running backend (PID $PID)..."
            kill "$PID"
            sleep 2
        else
            echo "No process with PID $PID is running."
        fi
    else
        echo "PID file is empty."
    fi
else
    echo "No PID file found."
fi


# Start new instance
echo "Starting backend with $NEW_JAR_FILE"
nohup java -jar "$NEW_JAR_FILE" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "Started new backend with PID $(cat $PID_FILE)"


# restart nginx
nginx -s reload

echo "Deployment completed at $(date)"
