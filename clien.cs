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
//post

using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
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

            // Create the request message with an empty content
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Content = new StringContent("", System.Text.Encoding.UTF8, "application/json");

            // Make the HTTP request
            HttpResponseMessage response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();

            // Process the response
            string responseBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine(responseBody);
        }
    }
}

//expiration
int expireDateTimestamp = 1678901234; 
DateTime referencePoint = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc); // Unix epoch

DateTime expireDate = referencePoint.AddSeconds(expireDateTimestamp);
DateTime currentDate = DateTime.UtcNow; // Get the current date and time in UTC

if (expireDate > currentDate)
{
    // Token is not expired
    Console.WriteLine("Token is still valid.");
}
else
{
    // Token is expired
    Console.WriteLine("Token has expired.");
}

