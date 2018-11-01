from .models import URL
import json

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for
    else:
        return request.META.get('REMOTE_ADDR')

def get_group(self, data_json):
    namedata = data_json["data"]
    namejson = json.loads(namedata)
    if 'urlpk' in self.scope["session"]:
        urlpk = self.scope["session"]['urlpk']
    else:
        urlpk = "no-url-or-group-specified"
        self.scope["session"]['urlpk'] = urlpk

    # overeride if group is specified
    if "group" in namejson:
        urlpk = namejson["group"]
        self.scope["session"]['urlpk'] = urlpk

    print(urlpk)
    url, created = URL.objects.get_or_create(pk=urlpk)
    print(url.name)
    return url, namejson