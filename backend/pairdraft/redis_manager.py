# Redis Manager singleton

import os
from urllib.parse import urlparse
import redis

from pairdraft.settings import IS_PRODUCTION


class RedisManager(object):
    def __init__(self):
        if IS_PRODUCTION:
            redis_url = urlparse(os.environ.get('REDIS_URL'))
            self.r = redis.Redis(host=redis_url.hostname, port=redis_url.port, password=redis_url.password, decode_responses=True)
        else:
            self.r = redis.Redis(host='localhost', port=6379, decode_responses=True)

redis_manager = RedisManager()
    