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
//Bearer token with post api object
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

class Program
{
    static async Task Main()
    {
        string url = "https://example.com/api/some-endpoint";
        string bearerToken = "your-bearer-token";

        using (HttpClient client = new HttpClient())
        {
            // Set the bearer token
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

            // Create the API object
            YourAPIObject apiObject = new YourAPIObject
            {
                // Set the properties of the API object
                // ...
            };

            // Serialize the API object to JSON
            string jsonContent = JsonConvert.SerializeObject(apiObject);

            // Set the JSON content as the request body
            StringContent content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            // Make the HTTP POST request
            HttpResponseMessage response = await client.PostAsync(url, content);
            response.EnsureSuccessStatusCode();

            // Process the response
            string responseBody = await response.Content.ReadAsStringAsync();
            Console.WriteLine(responseBody);
        }
    }
}

public class YourAPIObject
{
    // Define the properties of your API object
    // ...
}

//powershell
$baseUrl = "https://example.com/api/some-endpoint"
$username = "your-username"
$password = "your-password"

# Create a credential object with the username and password
$credential = New-Object System.Management.Automation.PSCredential($username, (ConvertTo-SecureString -String $password -AsPlainText -Force))

# Create a hashtable to specify the basic authentication header
$headers = @{
    "Authorization" = "Basic " + [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("$($credential.UserName):$($credential.GetNetworkCredential().Password)"))
    "Content-Type" = "application/json"
}

# Create the body payload
$body = @{
    "key1" = "value1"
    "key2" = "value2"
} | ConvertTo-Json

# Make the API POST request
$response = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body

# Process the response
$response

