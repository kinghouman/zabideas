$baseUrl = "https://example.com/api/some-endpoint"
$username = "your-username"
$password = "your-password"

# Create a credential object with the username and password
$credential = New-Object System.Management.Automation.PSCredential($username, (ConvertTo-SecureString -String $password -AsPlainText -Force))

# Disable SSL/TLS certificate validation
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

# Create a web request object
$request = [System.Net.WebRequest]::Create($baseUrl)
$request.Method = "POST"

# Set basic authentication header
$encodedCredentials = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($credential.UserName + ":" + $credential.GetNetworkCredential().Password))
$request.Headers.Add("Authorization", "Basic " + $encodedCredentials)

# Set content type
$request.ContentType = "application/json"

# Create the body payload
$body = @{
    "key1" = "value1"
    "key2" = "value2"
} | ConvertTo-Json

# Convert the body payload to bytes
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

# Set content length
$request.ContentLength = $bytes.Length

# Write the body payload to the request stream
$requestStream = $request.GetRequestStream()
$requestStream.Write($bytes, 0, $bytes.Length)
$requestStream.Close()

# Get the response
$response = $request.GetResponse()

# Read the response
$reader = New-Object System.IO.StreamReader($response.GetResponseStream())
$responseBody = $reader.ReadToEnd()
$reader.Close()

# Process the response
$responseBody
