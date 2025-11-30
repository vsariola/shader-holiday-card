// For GLSL / python version
#version 330
uniform vec2 iResolution;
uniform float iTime;
uniform int iMode;
out vec4 fragColor;

// For ShaderToy version, replace the previous lines with:
//
// const int iMode = 0;
//
// iMode can be:
//   0: previewing rotating foreground against background
//   1: background print
//   2: foreground print
//   3: original animation from which the background is generated
//   4: blends between all the different modes
#define AA 4 // antialiasing, each pixel is sampled from AA * AA points
const float RINGS = 50.; // how many rings there are in the foreground spiral
const float REPSPERROUND = 16.; // how many arms there are in the foreground spiral
const float PI = acos(-1.);
const float DUTYCYCLE = 0.3; // what amount of the foreground is transparent
const float LINEWIDTH = 0.002; // the width of the cutting lines for the background
const float PRINTSIZE = 145.; // nominal print size of the background, in mm
const float HOLESIZE = 3.; // size of the center hole, in mm
const float FGSIZE = 139.2; // diameter of the foreground, in mm

//------

float pi = 3.1415926535;


float map(vec3 p,float z) {    
    float a = z*.1;    
    vec3 q = p;
    q.xy *= mat2(cos(a),sin(a),-sin(a),cos(a));
    q.y += pi/2.;
    vec3 w = cos(q)*sin(q.yzx);
    return w.x+w.y+w.z+1.;
}


vec3 animation(vec2 uv,float T) {
    vec3 o = vec3(0.,0.,T*pi*2.);
    
    if (length(uv)>1.)
        return vec3(1);
    
    vec3 r = normalize(vec3(uv,1.5));

    
    float m,d = 0.;
    int i = 0;
    
    for (i=0;i<500;i++) {         
        vec3 p = o + d*r;
        float m = map(p,d*r.z);
        d += m*.2;        
        if (m < .001) {
            break;
        }
    }    
           

    // Time varying pixel color
    
    vec3 f = d*r*.2+.1;
    vec3 a = f;
    
    for (int k=0;k <6;k++) {                
    f.x = cos(4.*f.x);
        f.xy = f.yx;        
        float a = .5;
        f.xy*=mat2(cos(a),sin(a),-sin(a),cos(a));
    }
    
    float t = f.y;   
    
    vec3 A = vec3(.5);
    vec3 B = vec3(.5);
    vec3 C = vec3(.5,.5,.6)*1.;
    vec3 D = vec3(0,1,1.5)-f.z+a.y*3.+.5;
   
   
    vec3 z = A+B*cos(C*t+D);

    
    vec3 q = exp2(-d*.2+4.)*z;
    float ao = float(500-i)/500.;
    vec3 col = vec3(pow(ao,14.)*q);
    col = sqrt(tanh(col))-.1;
    return col;
}

//------

float phase(vec2 uv) {
    return REPSPERROUND*atan(uv.y,uv.x)/2./PI + RINGS*length(uv);
}

vec3 background(vec2 uv) {
    // add cutting aides & marks
    if (length(uv-.72)<.01)
        return vec3(0.);
    if (length(uv-vec2(.76,.69))<.02)
        return vec3(0.);
    if (abs(max(abs(uv.x),abs(uv.y))-1.)<LINEWIDTH)
        return vec3(0.);
    if (length(uv)<HOLESIZE/PRINTSIZE)
        return vec3(1.);

    // generate background print by slicing the animation
    return animation(uv,phase(uv));
}

vec3 foreground(vec2 uv,float t) {
    // add cutting aides & marks
    float maskrad = FGSIZE/PRINTSIZE;
    if (length(uv/maskrad-.72)<.01)
        return vec3(0.);
    if (length(uv/maskrad-vec2(.76,.69))<.02)
        return vec3(0.);
    if (length(uv)>maskrad)
        return vec3(1.);
    if (length(uv)<HOLESIZE/PRINTSIZE)
        return vec3(1.);

    // generate foreground spiral
    float k = mod(phase(uv)-t,1.);
    if (k > DUTYCYCLE)
        return vec3(0.);
    return vec3(1.);
}

// For ShaderToy, replace the following two lines with:
// void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
void main() {
    vec4 fragCoord = gl_FragCoord;

    vec3 col;

    // we'll take the modulus, to make it easy to see that the animation
    // really loops
    float t = mod(iTime,1.);

    for (int x=0;x<AA;x++) {
        for (int y=0;y<AA;y++) {
            vec2 uv = ((fragCoord.xy+vec2(x,y)/float(AA))*2.-iResolution.xy)/iResolution.y;
            switch (iMode) {
                default:
                    col += foreground(uv,t) * background(uv);
                    break;
                case 1:
                    col += background(uv);
                    break;
                case 2:
                    col += foreground(uv,t);
                    break;
                case 3:
                    col += animation(uv,t);
                    break;
                case 4:
                    int step = int(iTime / 5.) % 4;
                    float alpha = fract(iTime / 5.);
                    alpha = 1./(1. + exp(-(alpha-.5)*30.));
                    col += step == 0 ? mix(background(uv),foreground(uv,t),alpha) :
                           step == 1 ? mix(foreground(uv,t),foreground(uv,t) * background(uv),alpha) :
                           step == 2 ? mix(foreground(uv,t) * background(uv),animation(uv,t),alpha) :
                                       mix(animation(uv,t),background(uv),alpha);

            }
        }
    }
    fragColor = vec4(col/float(AA*AA),1.);
}
