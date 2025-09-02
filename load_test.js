import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
    vus: 400,           
    duration: '2m',     
};

export default function () {
    http.get('https://educonnectforum.web.app/');
    sleep(1);           
}
