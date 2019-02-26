import json

from .models import URL


def get_group(self, data_json):
    print('get_group start session: ' + str(self.scope["session"].session_key))
    namedata = data_json["data"]
    namejson = json.loads(namedata)
    if 'urlpk' in self.scope["session"]:
        print('urlpk found: ')
        print(self.scope["session"]["urlpk"])
        urlpk = self.scope["session"]["urlpk"]
        print(self.scope["session"]["urlpk"])
    else:
        urlpk = "no-url-or-group-specified"
        print('urlpk not found:')
        self.scope["session"]['urlpk'] = urlpk
        print(self.scope["session"]["urlpk"])

    # overeride if group is specified
    if "group" in namejson:
        urlpk = namejson["group"]
        print("group override: ")
        print(self.scope["session"]["urlpk"])
        self.scope["session"]["urlpk"] = urlpk
        print(self.scope["session"]["urlpk"])

    print(urlpk)
    url, created = URL.objects.get_or_create(pk=urlpk)
    print(url.name)
    self.scope["session"].accessed = False
    self.scope["session"].modified = False
    print('get_group end session: ' + str(self.scope["session"].session_key))
    return url, namejson
