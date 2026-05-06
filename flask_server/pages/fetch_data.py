# flask_server/pages/fetch_data.py
import requests
import json
import os

def fetch_adzuna_jobs(app_id, app_key, logger, country_code="in", page=1, keywords="python", location="india", results_per_page=12):
    if not app_id or not app_key:
        logger.error("Error: ADZUNA_APP_ID and ADZUNA_APP_KEY must be provided.")
        return [], 0

    BASE_URL = "http://api.adzuna.com/v1/api/jobs"
    url = f"{BASE_URL}/{country_code}/search/{page}"

    search_params = {
        "app_id": app_id,
        "app_key": app_key,
        "results_per_page": results_per_page,
        "what": keywords,
        "where": location,
        "sort_by": "date",
        "content-type": "application/json"
    }
    logger.info(f"Fetching Adzuna jobs from: {url} with params: {search_params}")
    try:
        response = requests.get(url, params=search_params)
        response.raise_for_status()
        data = response.json()
        
        # Filter fields to reduce payload size for listing
        raw_results = data.get("results", [])
        filtered_results = []
        for job in raw_results:
            filtered_results.append({
                "id": job.get("id"),
                "title": job.get("title"),
                "description": job.get("description"),
                "company": {
                    "display_name": job.get("company", {}).get("display_name"),
                    "logo_url": None
                },
                "location": job.get("location"),
                "salary_max": job.get("salary_max"),
                "salary_min": job.get("salary_min"),
                "category": job.get("category"),
                "created": job.get("created"),
                "apply_url": job.get("redirect_url"), # Adzuna's redirect_url is the apply link
                "redirect_url": job.get("redirect_url"),
                "url": job.get("redirect_url"),
            })
            
        return filtered_results, data.get("count", 0)
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching jobs from Adzuna: {e}")
        return [], 0
    except json.JSONDecodeError:
        logger.error(f"Error decoding JSON from Adzuna.")
        return [], 0

def fetch_adzuna_job_by_id(app_id, app_key, logger, job_id, country_code="in"):
    if not app_id or not app_key:
        return None

    BASE_URL = "http://api.adzuna.com/v1/api/jobs"
    # To fetch by ID, we use the search API with results_per_page=1 and id=...
    url = f"{BASE_URL}/{country_code}/search/1"

    search_params = {
        "app_id": app_id,
        "app_key": app_key,
        "results_per_page": 1,
        "id": job_id
    }
    
    try:
        response = requests.get(url, params=search_params)
        response.raise_for_status()
        data = response.json()
        results = data.get("results", [])
        if results:
            job = results[0]
            # Include more fields for details page
            return {
                "id": job.get("id"),
                "title": job.get("title"),
                "description": job.get("description"),
                "company": job.get("company"),
                "location": job.get("location"),
                "salary_max": job.get("salary_max"),
                "salary_min": job.get("salary_min"),
                "category": job.get("category"),
                "created": job.get("created"),
                "contract_type": job.get("contract_type"),
                "contract_time": job.get("contract_time"),
                "apply_url": job.get("redirect_url"),
                "skills": ["Communication", "Problem Solving", "Teamwork"], # Mock skills as Adzuna doesn't provide them clearly
                "experience": "Not specified" # Mock experience
            }
        return None
    except Exception as e:
        logger.error(f"Error fetching job by ID {job_id}: {e}")
        return None