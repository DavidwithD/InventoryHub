const defaultFetchCommand = `fetch("https://mobile.pinduoduo.com/proxy/api/api/aristotle/order_list_v4?pdduid=6913736127507&is_back=1", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9,ja;q=0.8,ko;q=0.7,zh-CN;q=0.6,zh;q=0.5",
    "anti-content": "0asAfqndDioyy9d55nyTAxXjdyKwz0rW0LW9yTdIOCjudZZwZf_2Rolh_e6YJuS3qHvSpPqPHsyT7pF0a0xGr9xOO6l7N4Bqa-2Vn0J1tWoAi-pUir7upIuGKaJYO1kOrrHAkvMTSG74Gdbjz83V_bi7_ibo7e7c1TQDBQbaG-eqZv7nHAd0A9vEyGx-tAxsdKIj2izN8nA3bEhAk3KqTAMFDzZNIi23ihnLo7h3Dzoz-oDtPq5O9ztPmsVwl39T504Ew2gEEaMMiJ3VNiDG8U5MI1ru5H_3yftLM672rywGE_qAH8L2jfFhT_c9Xk6E9LCSylmUxJay25fSJf8Ptq6g7sw26K6RrnwuVcPmmf2aKOpoTQ8vHdhhTW0aQzo99r1XkJsH3vnD8rtzfFF1kHqOppY_Orqt4eSk3ish5MQ6L6fnfonSZ7Q-io3bcE-T-5ic2Nx7sqQRV9wsXB9EfimCCC7497iE2s062kOZfMQdPs3S-ZaDmgD33JYLh5KbhJrRyhkedRkPdhEEFS_L4_jEcZUrdy86CIFIfC8vUJpXznz5JdLB_HGFgbMhUURu5b37rHuryeIoedITPwW-",
    "content-type": "application/json;charset=UTF-8",
    "priority": "u=1, i",
    "sec-ch-ua": "\\"Chromium\\";v=\\"142\\", \\"Google Chrome\\";v=\\"142\\", \\"Not_A Brand\\";v=\\"99\\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\\"macOS\\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "cookie": "api_uid=65c33292d8154cbc8b033c5e9701c5e2; plp_uid=65c33292d8154cbc8b033c5e9701c5e2; dilx=myIoe6sLPkAUlGI2O6Mzp; _nano_fp=Xpm8npgqnqmJlpXqlT_687xs0b6oyz8B3PQLTTjG; webp=1; jrpl=TvvggznIbfVOewTyQmCFjDHdhHSNXfL7; njrpl=TvvggznIbfVOewTyQmCFjDHdhHSNXfL7; PDDAccessToken=S33O5KU3QMWOCZUVDUJOPB2NYHOJ6SPU4R5LXA6OUITZ3243ROFA120136b; pdd_user_id=6913736127507; pdd_user_uin=PD7UR2FRSFL7CA2BJN7PA2QO7U_GEXDA; JSESSIONID=4DA67E24B0BB9C5CDA7698A45E6A14A4; pdd_vds=gaLLNyEbGbnbLGyoGItiEyIobibOEinnaiQytnQIObbtoOoIPEntbnoGPoyG",
    "Referer": "https://mobile.pinduoduo.com/orders.html?type=0&comment_tab=1&combine_orders=1&main_orders=1&refer_page_name=personal&refer_page_id=10001_1775349228831_3ierclj6vf&refer_page_sn=10001&page_id=10032_1775349239738_zmo0wov549&order_index=10&is_back=1"
  },
  "body": "{\\"type\\":\\"all\\",\\"page\\":1,\\"origin_host_name\\":\\"mobile.pinduoduo.com\\",\\"scene\\":\\"order_list_h5\\",\\"page_from\\":0,\\"pay_front_supports\\":[],\\"anti_content\\":\\"0asAfqndDioyy9d55nyTAxXjdyKwz0rW0LW9yTdIOCjudZZwZf_2Rolh_e6YJuS3qHvSpPqPHsyT7pF0a0xGr9xOO6l7N4Bqa-2Vn0J1tWoAi-pUir7upIuGKaJYO1kOrrHAkvMTSG74Gdbjz83V_bi7_ibo7e7c1TQDBQbaG-eqZv7nHAd0A9vEyGx-tAxsdKIj2izN8nA3bEhAk3KqTAMFDzZNIi23ihnLo7h3Dzoz-oDtPq5O9ztPmsVwl39T504Ew2gEEaMMiJ3VNiDG8U5MI1ru5H_3yftLM672rywGE_qAH8L2jfFhT_c9Xk6E9LCSylmUxJay25fSJf8Ptq6g7sw26K6RrnwuVcPmmf2aKOpoTQ8vHdhhTW0aQzo99r1XkJsH3vnD8rtzfFF1kHqOppY_Orqt4eSk3ish5MQ6L6fnfonSZ7Q-io3bcE-T-5ic2Nx7sqQRV9wsXB9EfimCCC7497iE2s062kOZfMQdPs3S-ZaDmgD33JYLh5KbhJrRyhkedRkPdhEEFS_L4_jEcZUrdy86CIFIfC8vUJpXznz5JdLB_HGFgbMhUURu5b37rHuryeIoedITPwW-\\",\\"size\\":10,\\"offset\\":\\"MO-01-260306-481820752191043\\"}",
  "method": "POST"
});`;

export default defaultFetchCommand;
