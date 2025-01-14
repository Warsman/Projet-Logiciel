﻿using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Net;
using System.Linq;

namespace Application_Lourde
{
    public class User
    {
        public string id { get; set; }
        public string username { get; set; }
        public string role { get; set; }
        public string password { get; set; }
        public string email { get; set; }
        public string accessToken { get; set; }

    }

    public class API
    {
        static HttpClient client { set; get; }
        static HttpClient clientlog { set; get; }

        public API()
        {
            client = new HttpClient(new HttpClientHandler { UseCookies = false });
            clientlog = new HttpClient();
            setConnection("auth", clientlog);
        }

        public static void setConnection(string serv, HttpClient http, IEnumerable<string> cookies = null)
        {
            http.DefaultRequestHeaders.Clear();
            if(serv == "auth")
            {
                http.BaseAddress = new Uri("http://78.123.229.253:4567/");
                http.DefaultRequestHeaders.Accept.Clear();
                http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            }else if (serv == "data" && cookies != null)
            {
                http.BaseAddress = new Uri("http://78.123.229.253:3456/");
                http.DefaultRequestHeaders.Accept.Clear();
                http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                http.DefaultRequestHeaders.Remove("Cookie");
                http.DefaultRequestHeaders.Add("Cookie", cookies);
            }
        }

        static void ShowMultipleUsers(List<User> users)
        {
            foreach (var user in users)
            {
                Console.WriteLine($"Id: {user.id} " + $"Username: {user.username}\tRole: " + $"{user.role}\tEmail: " + $"{user.email}");
            }
        }

        static void ShowUser(User user)
        {
            Console.WriteLine($"Id: {user.id} " + $"Username: {user.username}\tRole: " + $"{user.role}\tEmail: " + $"{user.email}");
        }

        static async Task<Uri> CreateUserAsync(User user)
        {
            HttpResponseMessage response = await client.PostAsJsonAsync("api/create", user);
            response.EnsureSuccessStatusCode();

            // return URI of the created resource.
            return response.Headers.Location;
        }

        //ne fonctionne pas car l'API renvoie plusieurs résultats
        static async Task<User> GetUserByIdAsync(string id)
        {
            User user = new User();
            HttpResponseMessage response = await client.GetAsync($"api/get/{id}");
            if (response.IsSuccessStatusCode)
            {
                user = await response.Content.ReadAsAsync<User>();
            }
            return user;
        }

        public async Task<List<User>> GetAllUserAsync()
        {
            var response = await client.GetAsync("users/getAll");
            List<User> result = new List<User>();

            if (response.IsSuccessStatusCode)
                result = await response.Content.ReadAsAsync<List<User>>();
            else { Console.WriteLine($"{0} ({1})", (int)response.StatusCode, response.ReasonPhrase); }

            return result;
        }

        static async Task<User> UpdateProductAsync(User user)
        {
            HttpResponseMessage response = await client.PutAsJsonAsync($"api/edit/{user.id}", user);
            response.EnsureSuccessStatusCode();

            // Deserialize the updated product from the response body.
            user = await response.Content.ReadAsAsync<User>();
            return user;
        }

        static async Task<HttpStatusCode> DeleteUserAsync(string id)
        {
            HttpResponseMessage response = await client.DeleteAsync($"api/delete/{id}");
            return response.StatusCode;
        }

        public async Task<int> Login(User user)
        {
            HttpResponseMessage response = await clientlog.PostAsJsonAsync($"/auth/login", user);
            int statutCode = (int)response.StatusCode;
            if (statutCode == 200)
                CheckToken(response);
            return statutCode;
        }

        static void CheckToken(HttpResponseMessage response)
        {
            if (response.Headers.SingleOrDefault(header => header.Key == "Set-Cookie").Value != null)
            {
                IEnumerable<string> cookies = response.Headers.SingleOrDefault(header => header.Key == "Set-Cookie").Value;
                setConnection("data", client, cookies);
            }
        }
    }
}