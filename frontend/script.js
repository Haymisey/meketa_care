document.addEventListener("DOMContentLoaded", () => {
  // To ensure that the elements are fully loaded before adding event listeners
  let cleanedResponse; // Declare cleanedResponse in a wider scope

  document.getElementById("analyze-btn").addEventListener("click", async () => {
    const symptoms = document.getElementById("symptoms").value;

    if (!symptoms) {
      alert("Please describe your symptoms.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/analyze-symptoms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symptoms }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.recommendations) {
        throw new Error("Invalid data received from server.");
      }

      // Clean up the response text
      cleanedResponse = data.recommendations
        .replace(/#+/g, "") // Remove hashtags
        .replace(/-+/g, "") // Remove hyphens
        .trim(); // Remove leading/trailing spaces

      const recommendations = data.recommendations;

      // Parse the list of symptoms from the response
      const symptomList = recommendations
        .split("\n")
        .filter((line) => line.trim() !== "");

      // Display the symptoms in an interactive form
      const symptomsForm = document.getElementById("symptoms-form");
      symptomsForm.innerHTML = symptomList
        .map(
          (symptom) => `
            <div class="symptom-item">
              <input type="checkbox" id="${symptom}" name="${symptom}">
              <label for="${symptom}">${symptom}</label>
            </div>
          `
        )
        .join("");

      // Show the submit button
      document.getElementById("submit-btn").style.display = "block";
    } catch (error) {
      console.error("Error analyzing symptoms:", error);
      alert("Unable to analyze symptoms. Please try again.");
    }
  });

  // Handle form submission
  document.getElementById("submit-btn").addEventListener("click", async () => {
    const selectedSymptoms = [];
    const checkboxes = document.querySelectorAll(
      "#symptoms-form input[type='checkbox']"
    );

    checkboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        selectedSymptoms.push(checkbox.nextElementSibling.textContent);
      }
    });

    console.log("Selected Symptoms:", selectedSymptoms);

    try {
      const response = await fetch("http://localhost:3000/diagnose-disease", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symptoms: selectedSymptoms }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Data:", data);

      if (!data || !data.disease) {
        throw new Error("Could not determine disease from symptoms.");
      }

      const disease = data.disease;

      // Display the disease
      document.getElementById(
        "disease"
      ).textContent = `Possible Disease: ${disease}`;

      // Optional: Display cleaned response if needed
      let formattedResponse;
      if (cleanedResponse) {
        formattedResponse = cleanedResponse.replace(
          /\*(.*?)\*/g,
          "<strong>$1</strong>"
        );
      }

      // Display the formatted response OUTSIDE the loop
      document.getElementById("recommendations").innerHTML =
        formattedResponse || "No recommendations available.";
    } catch (error) {
      console.error("Error diagnosing disease:", error);
      alert("Unable to diagnose disease. Please try again.");
    }
  });

  // Get user address and find nearby pharmacies using OpenCage API
  document
    .getElementById("find-pharmacies-btn")
    .addEventListener("click", async () => {
      const address = document.getElementById("pharmacy-address").value; // Get the address input by the user

      if (!address) {
        alert("Please enter an address.");
        return;
      }

      try {
        // Geocode the address using OpenCage API
        const response = await fetch("http://localhost:3000/geocode-address", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address }), // Send the address
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const { latitude, longitude } = data; // Get the coordinates from OpenCage API response

        // Now use the coordinates to find nearby pharmacies
        const pharmacyResponse = await fetch(
          "http://localhost:3000/find-pharmacies",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ latitude, longitude }), // Send the geocoded coordinates
          }
        );

        if (!pharmacyResponse.ok) {
          throw new Error(`HTTP error! Status: ${pharmacyResponse.status}`);
        }

        const pharmacyData = await pharmacyResponse.json();
        const pharmacies = pharmacyData.pharmacies;

        // Display the list of pharmacies
        const pharmaciesList = document.getElementById("pharmacies");
        pharmaciesList.innerHTML = pharmacies
          .map(
            (pharmacy) => `
            <li>
              <strong>${pharmacy.name}</strong><br>
              Address: ${pharmacy.address}<br>
              Latitude: ${pharmacy.latitude}, Longitude: ${pharmacy.longitude}
            </li>`
          )
          .join("");
      } catch (error) {
        console.error("Error finding pharmacies:", error);
        alert("Unable to find nearby pharmacies. Please try again.");
      }
    });
});
