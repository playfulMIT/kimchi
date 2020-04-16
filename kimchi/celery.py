import os
from kimchi.settings import CELERY_BROKER_URL
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kimchi.settings')

app = Celery('kimchi', broker=CELERY_BROKER_URL)
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

@app.task
def test(arg):
    print(arg)

@app.task(bind=True)
def debug_task(self):
    print('Request: {0!r}'.format(self.request))

# @app.on_after_configure.connect
# def setup_periodic_tasks(sender, **kwargs):
#     # Calls test('hello') every 10 seconds.
#     sender.add_periodic_task(10.0, test.s('hello'), name='add every 10')
#
#     # Calls test('world') every 30 seconds
#     sender.add_periodic_task(30.0, test.s('world'), expires=10)

@app.task
def this_fails():
    x = 1/0

