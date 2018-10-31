def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for
    else:
        return request.META.get('REMOTE_ADDR')

def get_group(data_json):
    namedata = data_json["data"]
    namejson = json.loads(namedata)
    if "group" in namejson:
        urlpk = namejson["group"]
        self.scope["session"]['urlpk'] = urlpk
    elif 'urlpk' in self.scope["session"]:
        urlpk = self.scope["session"]['urlpk']
    else:
        urlpk = "no-url-or-group-specified"
        self.scope["session"]['urlpk'] = urlpk
    print(urlpk)
    url, nourl = URL.objects.get_or_create(pk=urlpk)
    print(url.name)
    return url, nourl