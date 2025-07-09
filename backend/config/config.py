from dotenv import load_dotenv 
import os 

load_dotenv()

MYSQL_HOST=os.getenv('MYSQL_HOST')
MYSQL_USER=os.getenv('MYSQL_USER')
MYSQL_PASSWORD=os.getenv('MYSQL_PASSWORD')
MYSQL_DB=os.getenv('MYSQL_DB')
MYSQL_PORT=int(os.getenv('MYSQL_PORT',3306))

SQLALCHEMY_DATABASE_URI = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
)