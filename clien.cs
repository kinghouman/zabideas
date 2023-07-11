using System;
using System.Net.Http;
using System.Net.Http.Headers;

class Program
{
    static void Main()
    {
        string url = "https://example.com/api/some-endpoint";
        string username = "your-username";
        string password = "your-password";

        using (HttpClient client = new HttpClient())
        {
            // Set the basic authentication header
            string auth = $"{username}:{password}";
            string base64Auth = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes(auth));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", base64Auth);

            // Make your HTTP request
            HttpResponseMessage response = client.GetAsync(url).Result;
            response.EnsureSuccessStatusCode();

            // Process the response
            string responseBody = response.Content.ReadAsStringAsync().Result;
            Console.WriteLine(responseBody);
        }
    }
}
